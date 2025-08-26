import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode: "light",
  userId: "63701cc1f03239b7f700000e",
  displaySettings: {
    listingSwitchMs: 60000,
    photoRotateMs: 10000,
    uploadedRotateMs: 15000,
    newsRotateMs: 50000,
    updatedAt: null,
  },
};
export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setMode: (state) => {
      state.mode = state.mode === "light" ? "dark" : "light";
    },
    setDisplaySettings: (state, action) => {
      state.displaySettings = { ...state.displaySettings, ...action.payload };
    },
  },
});

export const { setMode, setDisplaySettings } = globalSlice.actions;

export default globalSlice.reducer;
