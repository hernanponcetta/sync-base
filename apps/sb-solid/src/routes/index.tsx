import { Title } from "@solidjs/meta"
import { action, createAsync, query, useAction } from "@solidjs/router"
import { Index } from "solid-js"

import { sb } from "~/sb-client"

let getTodos = query(async () => await sb.todos.findMany(), "getTodos")

let addTodoAction = action(async (formData: FormData) => {
  await sb.todos.insert({
    description: String(formData.get("description")),
    id: crypto.randomUUID(),
  })

  return new Response("success", { status: 200 })
}, "addTodo")

let deleteTodo = action(async (formData: FormData) => {
  await sb.todos.delete(String(formData.get("id")))
  return { success: true }
}, "deleteTodo")

export default function Home() {
  let todos = createAsync(() => getTodos())
  let submit = useAction(addTodoAction)

  let handleSubmit = (event: Event) => {
    event.preventDefault()
    submit(new FormData(event.target as HTMLFormElement))
    event.target.reset()
  }

  return (
    <div class="min-h-svh bg-stone-900 py-10 font-mono text-stone-100">
      <Title>Sync Base Solid</Title>
      <header>
        <h1 class="my-6 text-center text-4xl">Sync Base Solid</h1>
      </header>

      <main class="m-auto w-full max-w-5xl px-4">
        <div class="m-auto flex max-w-96 flex-col gap-y-3">
          <form method="post" onSubmit={handleSubmit}>
            <input
              autocomplete="off"
              class="w-full rounded-sm border border-stone-600 px-6 py-3 text-center transition-colors outline-none focus-within:ring-1 focus:placeholder-transparent focus-visible:border-stone-400 focus-visible:ring-stone-400/60"
              name="description"
              placeholder="What needs to be done?"
              type="text"
            />
          </form>

          <ul class="flex flex-col gap-y-1">
            <Index each={todos()}>
              {(todo) => (
                <li class="group relative w-full rounded-sm border border-stone-600 bg-stone-800 px-6 py-3 text-center">
                  {todo().description}
                  <form
                    action={deleteTodo}
                    class="absolute inset-y-0 right-2 flex items-center"
                    method="post"
                  >
                    <button
                      class="cursor-pointer rounded-sm bg-stone-600/50 px-1 py-1 opacity-0 transition-opacity outline-none group-hover:opacity-100 hover:bg-stone-500/50 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-stone-400/60"
                      name="id"
                      value={todo().id}
                    >
                      <svg
                        class="size-4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width={1.5}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                  </form>
                </li>
              )}
            </Index>
          </ul>
        </div>
      </main>
    </div>
  )
}
