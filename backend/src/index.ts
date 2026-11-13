import "dotenv/config"
import { createApp } from "./app"
import { env } from "./env"

const app = createApp()
app.listen(env.PORT, () => {
  console.log(`Mausam API listening on ${env.PORT}`)
})
