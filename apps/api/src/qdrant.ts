import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from './config.js';

const COLLECTION_NAME = 'memories';

export const qdrant = new QdrantClient({
  url: config.QDRANT_URL,
});

export async function initQdrant(): Promise<void> {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: config.EMBEDDING_DIMENSIONS,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log(`✅ Qdrant collection "${COLLECTION_NAME}" created`);
    } else {
      console.log(`✅ Qdrant collection "${COLLECTION_NAME}" exists`);
    }
  } catch (err: any) {
    console.error('⚠️  Qdrant initialization failed:', err.message);
    console.warn('   Memory semantic search will be unavailable');
  }
}

export async function upsertVector(id: string, vector: number[], payload: Record<string, any>): Promise<void> {
  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: [{ id, vector, payload }],
  });
}

export async function searchVectors(vector: number[], filter: Record<string, any>, limit: number = 5): Promise<any[]> {
  try {
    const results = await qdrant.search(COLLECTION_NAME, {
      vector,
      limit,
      filter: {
        must: Object.entries(filter).map(([key, value]) => ({
          key,
          match: { value },
        })),
      },
      with_payload: true,
    });
    return results;
  } catch {
    return [];
  }
}

export async function deleteVector(id: string): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    wait: true,
    points: [id],
  });
}

export async function deleteVectorsByFilter(filter: Record<string, any>): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: Object.entries(filter).map(([key, value]) => ({
        key,
        match: { value },
      })),
    },
  });
}

export { COLLECTION_NAME };
export default qdrant;
