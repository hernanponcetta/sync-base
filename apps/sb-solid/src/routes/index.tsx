import { Title } from "@solidjs/meta"
import { action, createAsync, query } from "@solidjs/router"
import { For } from "solid-js"

import { sb } from "~/sb-client"

let getTodos = query(() => sb.todos.findMany(), "getTodos")

let addTodo = action(async (formData: FormData) => {
  await sb.todos.insert({
    description: String(formData.get("description")),
    id: crypto.randomUUID(),
  })
  return new Response("success", { status: 200 })
}, "addTodo")

export default function Home() {
  let todos = createAsync(() => getTodos())

  return (
    <div class="min-h-svh bg-stone-900 text-stone-100 font-mono py-10">
      <Title>Sync Base Solid</Title>
      <header>
        <h1 class="text-center text-4xl my-6">Sync Base Solid</h1>
      </header>
      <main class="max-w-5xl w-full m-auto  px-4">
        <div class="max-w-96 m-auto flex flex-col gap-y-3">
          <form action={addTodo} method="post">
            <input
              autocomplete="off"
              class="w-full border text-center focus:placeholder-transparent border-stone-600 px-6 py-3 rounded-sm outline-none focus-within:ring-1 focus-visible:ring-stone-400 focus-visible:border-stone-400 focus transition-colors"
              name="description"
              placeholder="What needs to be done?"
              type="text"
            />
          </form>
          <ul class="flex flex-col gap-y-1">
            <For each={todos()} fallback={<div>Loading...</div>}>
              {(todo) => (
                <li class="w-full border text-center border-stone-600 bg-stone-800 px-6 py-3 rounded-sm">
                  {todo.description}
                </li>
              )}
            </For>
          </ul>
        </div>
      </main>
    </div>
  )
}
