import type { ConnectProvider } from "@polkadot-api/json-rpc-provider"
import { getSyncProvider } from "@polkadot-api/json-rpc-provider-proxy"
import { ErrorEvent, MessageEvent, WebSocket } from "ws"
import { open, rm } from "node:fs/promises"

const WIRE_FILE = `wire-logs.txt`

export const WebSocketProvider = (
  uri: string,
  protocols?: string | string[],
): ConnectProvider => {
  return getSyncProvider(async () => {
    try {
      await rm(WIRE_FILE)
    } catch (_) {}
    const fd = await open(WIRE_FILE, "w")
    const writeStream = fd!.createWriteStream({ encoding: "utf8" })

    let socket: WebSocket

    const openSocket = async (nTry = 1) => {
      socket = new WebSocket(uri, protocols)
      try {
        await new Promise<void>((resolve, reject) => {
          const onOpen = () => {
            resolve()
            socket.removeEventListener("error", onError)
          }
          socket.addEventListener("open", onOpen, { once: true })

          const onError = (e: ErrorEvent) => {
            reject(e)
            socket.removeEventListener("open", onOpen)
          }
          socket.addEventListener("error", onError, { once: true })
        })
      } catch (_) {
        console.log(
          `failed to open connection with ${uri}. Retrying in ${nTry}secs...`,
        )
        await new Promise((res) => setTimeout(res, 1_000 * nTry))
        await openSocket()
      }
    }

    await openSocket()

    return (onMessage, onHalt) => {
      const _onMessage = (e: MessageEvent) => {
        if (typeof e.data === "string") {
          writeStream.write(`<< ${e.data}\n`)
          onMessage(e.data)
        } else {
          console.log("e.data not string", e.data)
        }
      }

      socket.addEventListener("message", _onMessage)
      socket.addEventListener("error", onHalt)
      socket.addEventListener("close", onHalt)

      return {
        send: (msg) => {
          writeStream.write(`>> ${msg}\n`)
          socket.send(msg)
        },
        disconnect: () => {
          writeStream.close()
          socket.removeEventListener("message", _onMessage)
          socket.removeEventListener("error", onHalt)
          socket.removeEventListener("close", onHalt)
          socket.close()
        },
      }
    }
  })
}
