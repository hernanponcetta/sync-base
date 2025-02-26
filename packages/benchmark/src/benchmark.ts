export const values = [
  "nineteen thousand one hundred forty-seven",
  "twenty-six thousand eight",
  "forty-six thousand five hundred eighty-two",
  "seventy-five thousand one hundred twelve",
  "twenty-nine thousand nine hundred nine",
  "ninety-five thousand one hundred seventy-three",
  "ninety-six thousand four hundred ninety-eight",
  "thirty-three thousand five hundred fifty-three",
  "eleven thousand one hundred eighty-six",
  "eighty-seven thousand six hundred thirty-two",
  "fifteen thousand eight hundred eighty",
  "eighty-five thousand five hundred fifty-five",
  "sixty-six thousand nine hundred sixty-two",
  "fifty thousand four hundred fifty-two",
  "ninety-two thousand seven hundred seventeen",
  "thirty-four thousand seven hundred forty-three",
  "seventy-five thousand five hundred twenty-two",
  "twenty-eight thousand four hundred seventy-five",
  "forty-two thousand three hundred seventy",
  "ninety-two thousand seven hundred seventeen",
] as const

export function generateTestData(rows: number) {
  const result = []
  for (let i = 0; i < rows; i++) {
    const randomIndex = Math.floor(Math.random() * values.length)
    const randomString = values[randomIndex]
    result.push({
      a: i + 1,
      b: Math.floor(Math.random() * 90000) + 10000,
      c: randomString,
    })
  }
  return result
}
