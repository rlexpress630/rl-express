
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';

const Login: React.FC = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();

  const handleLogin = (role: 'ADMIN' | 'MOTOBOY') => {
    const mockUser = {
      id: role === 'ADMIN' ? 'admin-1' : 'driver-1',
      name: role === 'ADMIN' ? 'Administrador' : 'Carlos (Motoboy)',
      role
    };
    setUser(mockUser);
    navigate(role === 'ADMIN' ? '/admin' : '/motoboy');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-red-600 to-red-800">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl text-center">
        <div className="mb-8">
          <div className="bg-red-100 dark:bg-red-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold dark:text-white tracking-tight">RL EXPRESS</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Escolha seu painel para continuar</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('ADMIN')}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Acesso Administrativo</span>
          </button>

          <button
            onClick={() => handleLogin('MOTOBOY')}
            className="w-full py-4 px-6 bg-white dark:bg-gray-700 border-2 border-red-600 dark:border-red-400 text-red-600 dark:text-red-400 font-semibold rounded-xl transition-all hover:bg-red-50 dark:hover:bg-gray-600 flex items-center justify-center space-x-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Painel do Motoboy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
