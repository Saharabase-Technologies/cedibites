'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import Button from '../components/base/Button'
import Navbar from '../components/layout/Navbar'
import Loader from '../components/base/Loader'
import UniversalSearch from '../components/ui/UniversalSearch'
import DynamicGreeting from '../components/ui/DynamicGreeting'
import HeroSearch from '../components/sections/HeroSearch'
import MenuGrid from '../components/ui/MenuGrid'
import PromoBanner from '../components/ui/PromoBanner'
import Footer from '../components/layout/Footer'




// Capitalised so React - and `react-hooks/rules-of-hooks` - can tell this is a
// component. Lowercase, the rule assumes any hook inside is being called from a
// plain function and flags it, which is what kept the hooks gate red.
export default function Page() {
  const [isLoading, setIsLoading] = useState(false);



  return (
    <div className='bg-image  overflow-y-auto'>
      <div>
        <Navbar />

      </div>
      <div className='mt-24 '>
        <HeroSearch />
      </div>
      <MenuGrid />
      <Footer />


    </div>
  )
}
