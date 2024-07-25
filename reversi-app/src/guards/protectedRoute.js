import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = sessionStorage.getItem('jwt');

  if (!token) {
    return <Navigate to={`/${location.pathname.split('/')[1]}/login`} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
