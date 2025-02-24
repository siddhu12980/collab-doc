import axios from "axios";
import { Document } from "../types/auth";
import { Character } from "../sync/sync";
import { API_URL } from "../config/constants";
const baseUrl = API_URL;

export const docAPi = {
  getToken: async (): Promise<string | null> => {
    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    return token;
  },

  gelAllDocs: async (): Promise<Document[] | void> => {
    try {
      const toekn = await docAPi.getToken();

      if (!toekn) {
        console.error("No token found");
        return;
      }
      console.log("Token", toekn);

      const data = await axios.get(`${baseUrl}/docs/all`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${toekn}`,
        },
      });

      console.log(" Get ALl docs", data.data);

      const docs = data.data;

      return docs;
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      return;
    }
  },

  getDoc: async (docId: string): Promise<Document | void> => {
    try {

      const token = await docAPi.getToken();

      if (!token) {
        console.error("No token found");
        return;
      }

      const data = await axios.get(`${baseUrl}/docs/${docId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(" Get doc from Id", data.data);
      return data.data;
    } catch (error) {
      console.error("Failed to fetch document:", error);
      return;
    }
  },

  createDoc: async (title: string): Promise<Document | void> => {
    try {
      const token = await docAPi.getToken();

      if (!token) {
        console.error("No token found");
        return;
      }

      const data = await axios.post(
        `${baseUrl}/docs`,
        { title },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(" Create doc", data.data);
      return data.data;
    } catch (error) {
      console.error("Failed to create document:", error);
      return;
    }
  },

  updateDoc: async (
    docID: string,
    newTitle?: string,
    newContent?: string,
    newCharacters?: Character[],
    newVersion?: number,
    newLastUpdateID?: string
  ): Promise<Document | void> => {
    try {
      const token = await docAPi.getToken();

      if (!token) {
        console.error("No token found");
        return;
      }

      const data = await axios.put(
        `${baseUrl}/docs/${docID}`,
        {
          title: newTitle,
          content: newContent,
          characters: newCharacters,
          version: newVersion,
          lastUpdateID: newLastUpdateID,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(" Update doc", data.data);
      return data.data;
    } catch (error) {
      console.error("Failed to update document:", error);
      return;
    }
  },

  deleteDoc: async (docId: string): Promise<void> => {
    try {
      const token = await docAPi.getToken();
      const data = await axios.delete(`${baseUrl}/docs/${docId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(" Delete doc", data.data);
    } catch (error) {
      console.error("Failed to delete document:", error);
      return;
    }
  },

  joinDoc: async (doc_code: string): Promise<Document | void> => {
    try {
      const token = await docAPi.getToken();

      if (!token) {
        console.error("No token found");
        return;
      }

      const data = await axios.get(`${baseUrl}/join?code=${doc_code}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!data) {
        return;
      }

      console.log(" Join doc", data.data);

      return data.data;
    } catch (error) {
      console.error("Failed to join document:", error);
      return;
    }
  },
};

export default docAPi;
