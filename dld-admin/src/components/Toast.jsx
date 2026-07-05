import { useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed bottom-5 right-5 ${bgColor} text-white px-5 py-3 rounded-lg shadow-card-hover flex items-center gap-3 animate-slideIn z-50`}>
      {type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
      <span>{message}</span>
    </div>
  );
};

export default Toast;
