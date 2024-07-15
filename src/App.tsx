import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import './build.css'
// import { useState } from 'react';

const queryClient = new QueryClient();

async function getTweets() {
  const jsonTweets = await chrome.storage.local.get(['savedTweets']);
  const tweets = JSON.parse(jsonTweets.savedTweets);

  return tweets;
}

function App() {
  // const [page, setPage] = useState<"Content" | "Hooks" | "Settings">("Content");

  return (
    <QueryClientProvider client={queryClient}>
      <div className='text-purple-900 text-lg'>
        123213312321321312321321321132
      </div>
      <Content />
    </QueryClientProvider>
  )
}

function Content() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['repoData'],
    queryFn: async () => {
      return await getTweets();
    },
    refetchInterval: 1000
  });

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>An error has occurred: {error.message}</div>
  if (!data || !data.savedTweets) return <div>No data</div>

  return (
    <div>
      {
        data.savedTweets.map((tweetMeta: any) => {
          return (
            <div key={tweetMeta.tweet.id}>
              <p>{tweetMeta.tweet.url}</p>
            </div>
          )
        })
      }
    </div>
  )
}

// function Hooks() {

// }

// function Settings() {

// }

export default App
