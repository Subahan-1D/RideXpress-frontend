import config from "@/config";
import axios, { type AxiosRequestConfig } from "axios";

import { setCredentials } from "@/redux/features/authSlice"; 

import type { RootState } from "@/redux/store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const injectStore = (_store: any) => {
  store = _store;
};

export const axiosInstance = axios.create({
  baseURL: config.baseUrl,
  withCredentials: true,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  function (config) {
    if (store) {
      const state = store.getState() as RootState;
      const token = state.auth?.accessToken;
      
      console.log("Redux Token:", token ? "Found!" : "Missing!");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Attached Header:", config.headers.Authorization);
      }
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

let isRefreshing = false;

let pendingQueue: {
  resolve: (value: unknown) => void;
  reject: (value: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  pendingQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  pendingQueue = [];
};

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry: boolean;
    };

    if (
      error.response &&
      (error.response.status === 401 ||
        error.response.status === 403 ||
        error.response.status === 500) &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh-token"
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const res = await axiosInstance.post("/auth/refresh-token");
        const newAccessToken = res.data?.data?.accessToken || res.data?.accessToken;

        if (store && newAccessToken) {
          store.dispatch(
            setCredentials({
              user: store.getState().auth.user,
              accessToken: newAccessToken,
            })
          );
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);