
import { initializeApp, FirebaseApp } from "firebase/app";
import {
    getFirestore, doc, onSnapshot, setDoc, updateDoc,
    collection, addDoc, getDoc, serverTimestamp, Firestore
} from "firebase/firestore";
import { Expense, ItineraryItem, Ticket, UserProfile, PackingItem, TripData } from "../types";

// Firebase設定 (環境変数から読み込み)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase初期化を安全に行う（環境変数が欠けていてもアプリをクラッシュさせない）
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("[Firebase] 環境変数が設定されていません。Firebase機能は無効化されます。");
    }
} catch (error) {
    console.error("[Firebase] 初期化に失敗しました:", error);
}


/**
 * 新しい旅行を作成し、IDを返します
 */
export const createNewTrip = async (initialData: Omit<TripData, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!db) {
        console.error("Firebase is not initialized");
        return null;
    }
    try {
        const cleanData = JSON.parse(JSON.stringify(initialData));
        const docRef = await addDoc(collection(db, "trips"), {
            ...cleanData,
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
    if (!db) {
        console.error("Firebase is not initialized");
        return () => { };
    }
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
    if (!db) {
        console.error("Firebase is not initialized");
        return;
    }
    try {
        const cleanData = JSON.parse(JSON.stringify(data));
        const tripRef = doc(db, "trips", tripId);
        await updateDoc(tripRef, {
            ...cleanData,
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
    if (!db) {
        console.error("Firebase is not initialized");
        return null;
    }
    const docRef = doc(db, "trips", tripId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as TripData : null;
};
