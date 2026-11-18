import { getFirestore } from 'firebase-admin/firestore';

const MAX_BATCH_SIZE = 400;

export class FirestoreRepository {
  constructor(collectionName) {
    this.collection = getFirestore().collection(collectionName);
  }

  async list() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((document) => document.data());
  }

  async applyChanges(items, deletedIds) {
    const operations = [];

    items.forEach((item) => {
      const id = String(item.id);
      operations.push({ type: 'set', id, item });
    });
    deletedIds.forEach((id) => operations.push({ type: 'delete', id: String(id) }));

    for (let index = 0; index < operations.length; index += MAX_BATCH_SIZE) {
      const batch = getFirestore().batch();
      operations.slice(index, index + MAX_BATCH_SIZE).forEach((operation) => {
        const reference = this.collection.doc(operation.id);
        if (operation.type === 'set') batch.set(reference, operation.item);
        else batch.delete(reference);
      });
      await batch.commit();
    }
  }
}
