'use client'

import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import supabase from '@/app/lib/supabase'
import Link from 'next/link'

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([])

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data: leaderboards, error } = await supabase.from('leaderboards').select()

        if (error) {
          throw error
        }

        setLeaderboardData(leaderboards)
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      }
    }

    fetchLeaderboard()
  }, [])

  return (
    <div className='flex min-h-screen flex-col items-center justify-center py-6'>
      <Head>
        <title>Leaderboard - Chicken Coup</title>
        <meta name='description' content='Leaderboard for Chicken Coup game' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className='flex w-full flex-1 flex-col items-center px-4 md:px-20'>
        <h1 className='text-gold mb-8 text-3xl font-bold'>Leaderboard</h1>
        <Link className='p-4' href={'/'}>
          <span>Go back</span>
        </Link>
        <div className='max-h-screen w-full overflow-auto rounded-lg bg-[#262626] p-6 shadow-lg'>
          <table className='min-w-full divide-y divide-gray-700'>
            <thead>
              <tr className='bg-gray-800'>
                <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300 md:px-6 md:text-sm'>
                  Winner
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300 md:px-6 md:text-sm'>
                  Loser
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300 md:px-6 md:text-sm'>
                  Score
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-700'>
              {leaderboardData.map((entry, index) => (
                <tr key={index} className='bg-gray-700'>
                  <td className='whitespace-nowrap px-4 py-4 text-xs font-medium text-gray-300 md:px-6 md:text-sm'>
                    {entry.winningPlayerName}
                  </td>
                  <td className='whitespace-nowrap px-4 py-4 text-xs font-medium text-gray-300 md:px-6 md:text-sm'>
                    {entry.losingPlayerName}
                  </td>
                  <td className='whitespace-nowrap px-4 py-4 text-xs font-medium text-gray-300 md:px-6 md:text-sm'>
                    {entry.winningPlayerLives} - {entry.losingPlayerLives}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default Leaderboard
