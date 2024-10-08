'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ComponentPropsWithoutRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Image from 'next/image';

// Add this constant at the top of your file, outside the component
const APP_VERSION = "0.0.2"; // Update this version number as needed

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type LLMEndpoint = {
  id: string
  name: string
}

const llmEndpoints: LLMEndpoint[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4o', name: 'GPT-4o' },
]

export function ModernLlmChatbot() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(llmEndpoints[0].id)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

  const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          model: selectedEndpoint,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from AI')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to read response')
      }

      const decoder = new TextDecoder()
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, aiMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5)
            if (data === '[DONE]') {
              setIsLoading(false)
              break
            }
            try {
              const { content } = JSON.parse(data)
              aiMessage.content += content
              setMessages((prev) => prev.map((msg) => (msg.id === aiMessage.id ? aiMessage : msg)))
            } catch (error) {
              console.error('Error parsing JSON:', error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 font-sans">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">AI Chat Assistant</CardTitle>
          <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select LLM" />
            </SelectTrigger>
            <SelectContent>
              {llmEndpoints.map((endpoint) => (
                <SelectItem key={endpoint.id} value={endpoint.id}>
                  {endpoint.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <div className="h-full overflow-y-auto pr-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user' ? 'bg-primary' : 'bg-secondary'
                    }`}>
                      {message.role === 'user' ? <User className="w-5 h-5 text-primary-foreground" /> : <Bot className="w-5 h-5 text-secondary-foreground" />}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 shadow-md overflow-hidden ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                          h2: ({...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                          h3: ({...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                          h4: ({...props}) => <h4 className="text-base font-bold mt-2 mb-1" {...props} />,
                          h5: ({...props}) => <h5 className="text-sm font-bold mt-2 mb-1" {...props} />,
                          h6: ({...props}) => <h6 className="text-xs font-bold mt-2 mb-1" {...props} />,
                          p: ({...props}) => <p className="mb-2" {...props} />,
                          ul: ({...props}) => <ul className="list-disc pl-6 mb-2 space-y-1" {...props} />,
                          ol: ({...props}) => <ol className="list-decimal pl-6 mb-2 space-y-1" {...props} />,
                          li: ({...props}) => <li className="mb-1" {...props} />,
                          strong: ({...props}) => <strong className="font-bold" {...props} />,
                          em: ({...props}) => <em className="italic" {...props} />,
                          blockquote: ({...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-2" {...props} />,
                          code({ className, children, ...props }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !props.inline && match ? (
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                className="mb-2 max-w-full overflow-x-auto"
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-200 rounded px-1 py-0.5" {...props}>
                                {children}
                              </code>
                            )
                          },
                          table: ({...props}) => <table className="border-collapse table-auto w-full mb-2" {...props} />,
                          thead: ({...props}) => <thead className="bg-gray-200" {...props} />,
                          tbody: ({...props}) => <tbody {...props} />,
                          tr: ({...props}) => <tr className="border-b" {...props} />,
                          th: ({...props}) => <th className="border p-2 font-bold" {...props} />,
                          td: ({...props}) => <td className="border p-2" {...props} />,
                          a: ({...props}) => <a className="text-blue-500 hover:underline" {...props} />,
                          img: ({src, alt, width, height, ...props}) => {
                            // Convert width and height to numbers if possible, or use defaults
                            const numWidth = typeof width === 'string' ? parseInt(width, 10) : width || 500;
                            const numHeight = typeof height === 'string' ? parseInt(height, 10) : height || 300;
                            
                            return (
                              <Image 
                                src={src || "/path/to/default-image.jpg"}
                                alt={alt || "Image"}
                                width={numWidth}
                                height={numHeight}
                                className="max-w-full h-auto"
                                {...props}
                              />
                            );
                          },
                          hr: ({...props}) => <hr className="border-t border-gray-300 my-4" {...props} />,
                          del: ({...props}) => <del className="line-through" {...props} />,
                          input: ({...props}) => {
                            if (props.type === 'checkbox') {
                              return <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600" {...props} />
                            }
                            return <input {...props} />
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2 shadow-md flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <form
            onSubmit={handleSubmit}
            className="flex w-full space-x-2"
          >
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange}
              className="flex-grow"
            />
            <Button type="submit" disabled={isLoading}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
          <div className="text-xs text-gray-500 flex justify-between w-full">
            <span>Created by Frank</span>
            <span>Version {APP_VERSION}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}