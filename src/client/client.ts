import { createClient } from "@polkadot-api/client"
import dot from "./generated/dot"
import roc from "./generated/roc"
import { WebSocketProvider } from "./ws-provider"

const connect = WebSocketProvider("wss://rpc.polkadot.io/")
export const client = createClient(connect as any, { dot, roc })
