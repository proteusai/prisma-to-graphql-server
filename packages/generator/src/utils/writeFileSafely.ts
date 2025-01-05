import fs from 'fs'
import path from 'path'
import { formatFile } from './formatFile'

export const writeFileSafely = async (writeLocation: string, content: any) => {
  fs.mkdirSync(path.dirname(writeLocation), {
    recursive: true,
  })

  console.log('>>>>>', writeLocation)
  const c = formatFile(content)
  console.log('>>>>>', c)

  fs.writeFileSync(writeLocation, c)
}
