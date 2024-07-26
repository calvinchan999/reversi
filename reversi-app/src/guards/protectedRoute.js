import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const location = useLocation();
  const token = sessionStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to={`/${location.pathname.split('/')[1]}/login`} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
