import React from "react";
import {
  FileText,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Document } from "../types/auth";

interface DocumentCardProps {
  document: Document;
  onDocumentClick: (id: string) => void;
  onUpdateTitle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DocumentCard({
  document,
  onDocumentClick,
  onUpdateTitle,
  onDelete,
}: DocumentCardProps) {
  const handleAction = (e: React.MouseEvent, action: (id: string) => void) => {
    e.stopPropagation();
    action(document.id);
  };

  return (
    <div
      onClick={() => onDocumentClick(document.id)}
      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer group relative"
    >
      <div className="absolute top-4 right-4 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => handleAction(e, onUpdateTitle)}
          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-600 rounded-lg"
          title="Update title"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => handleAction(e, onDelete)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-600 rounded-lg"
          title="Delete document"
        >
          <Trash2Icon className="w-4 h-4" />
        </button>
      </div>

      <FileText className="w-8 h-8 text-blue-500 mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">{document.title}</h3>
      <p className="text-sm text-gray-400">Code: {document.code}</p>
      <p className="text-sm text-gray-400 mt-2">
        Created: {new Date(document.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
