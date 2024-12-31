import React, { useState } from "react";
import { X } from "lucide-react";

interface UpdateTitleModalProps {
  currentTitle: string;
  onClose: () => void;
  onUpdate: (title: string) => Promise<void>;
}

const updateTitleModel1 = ({
  currentTitle,
  onClose,
  onUpdate,
}: UpdateTitleModalProps) => {
  const [title, setTitle] = useState(currentTitle);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim() === currentTitle) {
      return <></>;
    }

    setIsLoading(true);
    try {
      await onUpdate(title.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Update Document Title
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <p className="w-5 h-5">X</p>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter new title"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <div className="mt-4 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={
                isLoading || !title.trim() || title.trim() === currentTitle
              }
            >
              {isLoading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default updateTitleModel1;
