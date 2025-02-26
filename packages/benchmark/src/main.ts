import { syncBase } from "@sync-base/client"

import { generateTestData } from "./benchmark"
import "./style.css"
import { t1Table } from "./schema"

let html = String.raw

export let sb = syncBase({
  tables: [t1Table],
})

document.querySelector<HTMLDivElement>("#app")!.innerHTML = html`
  <div>
    <h1>Sync Base Benchmark</h1>
    <p id="result"></p>
    <div class="card">
      <button id="trigger" type="button">Run test</button>
    </div>
  </div>
`

document.getElementById("trigger")!.addEventListener("click", async () => {
  let data = generateTestData(1000)

  let startTime = performance.now()

  for (let value of data) {
    await sb.mutation.t1.insert(value)
  }

  let endTime = performance.now()

  // console.log(`Insertion took ${(endTime - startTime).toFixed(2)} ms`)
  document.getElementById("result")!.innerHTML =
    `Insertion took ${(endTime - startTime).toFixed(2)} ms`
})
