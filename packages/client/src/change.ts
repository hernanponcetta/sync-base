import { InferSelectModel, Table } from "drizzle-orm"

type ObjectStoreObjectId = [string, string]

export type Change<T extends Table> =
  | {
      object: InferSelectModel<T>
      objectId: string
      objectStore: string
      objectStoreObjectId: ObjectStoreObjectId
      synced: boolean
      syncId: string
      type: "insert"
    }
  | {
      objectId: string
      objectStore: string
      objectStoreObjectId: ObjectStoreObjectId
      snapShot: {
        [K in keyof T]: {
          original: T[K]
          updated: T[K]
        }
      }
      synced: boolean
      syncId: string
      type: "update"
    }
  | {
      objectId: string
      objectStore: string
      objectStoreObjectId: ObjectStoreObjectId
      synced: boolean
      syncId: string
      type: "delete"
    }
