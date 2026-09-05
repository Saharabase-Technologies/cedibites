'use client'

import React from 'react'
import GreetingBar from '../components/ui/GreetingBar'
import LiveOrderPill from '../components/ui/LiveOrderPill'
import HomeHero from '../components/ui/HomeHero'
import PromoBanner from '../components/ui/PromoBanner'
import StapleGrid from '../components/ui/StapleGrid'
import Footer from '../components/layout/Footer'

// Capitalised so React - and `react-hooks/rules-of-hooks` - can tell this is a
// component. Lowercase, the rule assumes any hook inside is being called from a
// plain function and flags it, which is what kept the hooks gate red.
//
// Four decisions, in order of how much they matter, on a flat ground.
//
// What used to be here: a greeting, a scrolling row of ten-plus category chips,
// a reorder rail, a rotating promo and fourteen menu cards, every band the same
// weight, the same 24px apart, over a tiled background pattern. The chips were a
// second and differently-behaved copy of the Menu tab's own filter, and tapping
// one turned this screen into a menu in place.
//
// The spacing below is deliberately uneven. A heading sits tight against the
// thing it names; the air goes between sections, not inside them.
export default function Page() {
  return (
    <div className='flex flex-col bg-bg pb-10'>

      {/* The pill renders nothing when there is no order in flight, which is
          most of the time. The greeting sitting alone is the intended state. */}
      <div className='page-x flex items-start justify-between gap-4 pt-5 pb-4 md:pt-8'>
        <GreetingBar />
        <LiveOrderPill />
      </div>

      <HomeHero />

      <div className='mt-10'>
        <PromoBanner />
      </div>

      <div className='mt-12'>
        <StapleGrid />
      </div>

      {/* A footer is a website thing. On a phone the tab bar is the way
          around, so this is desktop only. */}
      <Footer className='mt-16 hidden md:block' />
    </div>
  )
}
