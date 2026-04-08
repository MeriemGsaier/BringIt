import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  collectionData,
  docData,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CampItem } from '../models/item.model';
import { Session } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

  // Sessions
  createSession(session: Omit<Session, 'createdAt'> & { createdAt: number }): Promise<void> {
    const ref = doc(this.firestore, `sessions/${session.id}`);
    return setDoc(ref, session);
  }

  getSession(sessionId: string): Observable<Session | undefined> {
    const ref = doc(this.firestore, `sessions/${sessionId}`);
    return docData(ref) as Observable<Session | undefined>;
  }

  // Items
  getItems(sessionId: string): Observable<CampItem[]> {
    const ref = collection(this.firestore, `sessions/${sessionId}/items`);
    return collectionData(ref, { idField: 'id' }) as Observable<CampItem[]>;
  }

  addItem(sessionId: string, item: Omit<CampItem, 'id'>): Promise<any> {
    const ref = collection(this.firestore, `sessions/${sessionId}/items`);
    return addDoc(ref, item);
  }

  updateItem(sessionId: string, itemId: string, changes: Partial<CampItem>): Promise<void> {
    const ref = doc(this.firestore, `sessions/${sessionId}/items/${itemId}`);
    return updateDoc(ref, changes as any);
  }

  deleteItem(sessionId: string, itemId: string): Promise<void> {
    const ref = doc(this.firestore, `sessions/${sessionId}/items/${itemId}`);
    return deleteDoc(ref);
  }
}
