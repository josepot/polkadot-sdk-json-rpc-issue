import { getValidators } from "./getValidators"

console.log("quering validators data")
const validators = await getValidators()
console.log("got it!", validators)
