import { streamText } from 'ai'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { createOllama } from 'ollama-ai-provider'
import { type KeyboardEvent, useState } from 'react'
import { useForm } from 'react-hook-form'
import { type Change, diffWords } from 'diff'

const ollama = createOllama({
  baseURL: '/api',
})

export function App() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      prompt: '',
    },
  })
  const [response, setResponse] = useState<string>('')
  const [responseStatus, setResponseStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [diff, setDiff] = useState<Change[]>([])

  function handleFormKeyDown(evt: KeyboardEvent<HTMLFormElement>) {
    if (evt.key === 'Enter' && (evt.ctrlKey || evt.metaKey)) {
      handleSubmit(handleFormSubmit)()
    }
  }

  async function handleFormSubmit(data: { prompt: string }) {
    try {
      setResponse('')
      setDiff([])
      setResponseStatus('pending')

      const { textStream } = streamText({
        model: ollama('deepseek-r1:1.5b'),
        system:
          'You are a grammar correction tool. Improve the grammar of input prompts without adding extra text, explanations, or formatting. Output only the corrected text with no quotation marks or additional commentary.',
        prompt: data.prompt,
      })

      let thinking = true
      let response = ''

      for await (const textPart of textStream) {
        if (textPart === '</think>') {
          thinking = false
          continue
        }

        if (thinking) {
          continue
        }

        response = `${response}${textPart}`.trim()
        setResponse((currentResponse) => `${currentResponse}${textPart}`.trim())
      }

      setDiff(diffWords(data.prompt, response))
      setResponseStatus('success')
    } catch (error) {
      setResponseStatus('error')
      setResponse((error as Error).message)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(response)
    setCopyStatus('copied')

    setTimeout(() => {
      setCopyStatus('idle')
    }, 2000)
  }

  return (
    <div className="p-4">
      <div className="max-w-2xl w-full mx-auto">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-2"
          onKeyDown={handleFormKeyDown}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="prompt">Input text</label>
            <textarea
              id="prompt"
              {...register('prompt')}
              placeholder="Enter your text here..."
              className="border border-gray-200 rounded-sm py-1 px-1.5 text-base"
            />
          </div>

          <button
            disabled={responseStatus === 'pending'}
            type="submit"
            className="cursor-pointer bg-blue-500 text-white disabled:bg-blue-300 hover:bg-blue-600 motion-safe:transition-colors rounded-sm py-1.5 px-3"
          >
            {responseStatus === 'pending' ? 'Thinking...' : 'Improve'}
          </button>
        </form>

        {response && (
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex flex-row gap-4 justify-between items-center">
              <h2>Improved text</h2>

              <button
                type="button"
                disabled={copyStatus === 'copied'}
                onClick={handleCopy}
                className="flex flex-row gap-1 items-center text-sm border border-gray-200 bg-gray-50 hover:bg-gray-100 motion-safe:transition-colors cursor-pointer px-2 py-1 rounded-sm"
              >
                {copyStatus === 'copied' ? (
                  <CheckIcon size={14} />
                ) : (
                  <CopyIcon size={14} />
                )}

                {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="bg-gray-100 rounded-sm p-2 text-sm">{response}</div>
          </div>
        )}
      </div>
    </div>
  )
}
