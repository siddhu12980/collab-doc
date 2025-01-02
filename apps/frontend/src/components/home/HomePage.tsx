import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Link as LinkIcon } from "lucide-react";
import { Document } from "../../types/auth";
import CreateDocumentModal from "../modals/CreateDocumentModal";
import UpdateTitleModal from "../modals/updateTitleModel1";
import { docAPi } from "../../services/mockApi";
import DocumentCard from "../DocumentCard";

export default function HomePage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [docCode, setDocCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleUpdateTitle = (docId: string) => {
    setSelectedDocId(docId);
    setShowUpdateModal(true);
  };

  const handleUpdateTitleSubmit = async (newTitle: string) => {
    try {
      if (selectedDocId) {
        await docAPi.updateDoc(selectedDocId, newTitle);
        await fetchDocuments();
        setShowUpdateModal(false);
        setSelectedDocId(null);
      }
    } catch (error) {
      console.error("Failed to update document title:", error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await docAPi.deleteDoc(docId);
        await fetchDocuments();
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
  };

  useEffect(() => {
    fetchDocuments();

    return () => {
      setDocuments([]);
    };
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await docAPi.gelAllDocs();
      if (!data) {
        return;
      }
      setDocuments(data);

      console.log("All documents:", data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentClick = (docId: string) => {
    navigate(`/doc/${docId}`);
  };

  const handleCreateDocument = async (title: string) => {
    try {
      const newDoc = await docAPi.createDoc(title);

      if (!newDoc) {
        return;
      }

      setShowCreateModal(false);

      console.log("New document created:", newDoc);

      fetchDocuments();

      // navigate(`/doc/${newDoc.id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  const joinDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await docAPi.joinDoc(docCode);

      if (!data) {
        return;
      }

      console.log("Joined document:", data);

      setShowJoinModal(false);
      setDocCode("");

      navigate(`/doc/${data.id}`);
    } catch (error) {
      console.error("Failed to join document:", error);
    }
  };

  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Documents</h1>
          <div className="space-x-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Join Document
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              New Document
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDocumentClick={handleDocumentClick}
              onUpdateTitle={handleUpdateTitle}
              onDelete={handleDeleteDocument}
            />
          ))}
        </div>

        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">
                Join Document
              </h2>
              <form onSubmit={joinDocument}>
                <input
                  type="text"
                  value={docCode}
                  onChange={(e) => setDocCode(e.target.value)}
                  placeholder="Enter document code"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-4 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Join
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateModal && (
          <CreateDocumentModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateDocument}
          />
        )}

        {showUpdateModal && selectedDocId && (
          <UpdateTitleModal
            onClose={() => {
              setShowUpdateModal(false);
              setSelectedDocId(null);
            }}
            onUpdate={handleUpdateTitleSubmit}
            currentTitle={
              documents.find((d) => d.id === selectedDocId)?.title || ""
            }
          />
        )}
      </div>
    </div>
  );
}
