
import { initializeApp } from "firebase/app";
import {
    getFirestore, doc, onSnapshot, setDoc, updateDoc,
    collection, addDoc, getDoc, serverTimestamp
} from "firebase/firestore";
import { Expense, ItineraryItem, Ticket, UserProfile } from "../types";

// Firebase設定 (環境変数から読み込み)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 旅行データの型定義
export interface TripData {
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
    coverImage: string;
    expenses: Expense[];
    itinerary: ItineraryItem[];
    tickets: Ticket[];
    userProfiles: UserProfile[];
    budget: number;
    createdAt: any;
    updatedAt: any;
}

/**
 * 新しい旅行を作成し、IDを返します
 */
export const createNewTrip = async (initialData: Omit<TripData, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
        const docRef = await addDoc(collection(db, "trips"), {
            ...initialData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating trip:", error);
        throw error;
    }
};

/**
 * 指定された旅行IDのデータを購読します（リアルタイム同期）
 */
export const subscribeToTrip = (tripId: string, onUpdate: (data: TripData) => void) => {
    return onSnapshot(doc(db, "trips", tripId), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as TripData;
            onUpdate({ ...data, id: tripId });
        } else {
            console.error("No such trip!");
        }
    }, (error) => {
        console.error("Error subscribing to trip:", error);
    });
};

/**
 * 旅行データを更新します
 */
export const updateTripData = async (tripId: string, data: Partial<TripData>) => {
    try {
        const tripRef = doc(db, "trips", tripId);
        await updateDoc(tripRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating trip:", error);
        throw error;
    }
};

/**
 * 旅行データの存在確認
 */
export const getTripData = async (tripId: string) => {
    const docRef = doc(db, "trips", tripId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as TripData : null;
};
