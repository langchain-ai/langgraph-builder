import { NextApiRequest, NextApiResponse } from "next"
import * as fs from 'node:fs/promises'
import * as path from 'node:path'


const WORKSPACE_DIR = 'workspace'

type SaveResponse = { message: string } | { error: string }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default async function handler(req: NextApiRequest, res: NextApiResponse<SaveResponse>) {
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.dir( req.body, { depth: 5 })

  try {

    const { name = 'graph' } = req.body
    await fs.writeFile(
      path.join(process.cwd(), WORKSPACE_DIR, `${name}.json`),
      JSON.stringify(req.body, null, 2),
      'utf-8'
    )

    // await sleep(2000)
    return res.status(200).json({ message: 'Graph saved successfully' })
  
  }
  catch (error) {
    console.error('Error saving graph:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate code',})
  }

}
