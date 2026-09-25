import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import CrudPage from "./components/CrudPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ModuleDetail from "./pages/ModuleDetail.jsx";
import Products from "./pages/Products.jsx";
import Settings from "./pages/Settings.jsx";
import Login from "./pages/Login.jsx";
import { tableConfigs, tableNavOrder } from "./data/tables.js";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="module/:id" element={<ModuleDetail />} />
          <Route path="products" element={<Products />} />
          {tableNavOrder
            .filter((key) => key !== "products")
            .map((key) => (
              <Route
                key={key}
                path={tableConfigs[key].path}
                element={<CrudPage key={key} config={tableConfigs[key]} />}
              />
            ))}
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
