'use client'

import React from 'react'
import HeroSearch from '../components/sections/HeroSearch'
import MenuGrid from '../components/ui/MenuGrid'
import Footer from '../components/layout/Footer'

export default function Page() {
  return (
    <div className='bg-image overflow-y-auto'>
      <div className='mt-24'>
        <HeroSearch />
      </div>
      <MenuGrid />
      <Footer />
    </div>
  )
}
