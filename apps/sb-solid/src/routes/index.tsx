import { Title } from "@solidjs/meta"
import { createAsync } from "@solidjs/router"

import { sb } from "~/sb-client"

let getTodos = () => sb.query.todos.findMany({})

export default function Home() {
  let todos = createAsync(() => getTodos())

  return (
    <div class="bg-stone-900 h-svh text-stone-100 font-mono py-10">
      <Title>Sync Base Solid</Title>
      <header>
        <h1 class="text-center text-4xl my-6">Sync Base Solid</h1>
      </header>
      <main class="max-w-5xl w-full m-auto  px-4">
        <div class="max-w-96 m-auto">
          <input
            class="w-full border border-stone-600 px-6 py-3 rounded-sm outline-none focus-within:ring-1 focus-within:ring-stone-400 transition-colors"
            placeholder="What needs to be done?"
            type="text"
          />
        </div>
        <ul>
          <li></li>
        </ul>
      </main>
    </div>
  )
}
