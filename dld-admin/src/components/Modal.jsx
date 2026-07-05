import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-card-hover w-full max-w-md max-h-[90vh] animate-slideIn flex flex-col">
        <div className="flex justify-between items-center p-5 border-b flex-shrink-0">
          <h3 className="text-lg font-bold text-dark">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-dark flex-shrink-0"><FiX size={20}/></button>
        </div>
        <div className="p-5 overflow-y-auto modal-scroll flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
