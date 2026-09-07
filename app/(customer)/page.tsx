'use client'

import React from 'react'
import GreetingBar from '../components/ui/GreetingBar'
import HomeHero from '../components/ui/HomeHero'
import PromoBanner from '../components/ui/PromoBanner'
import StapleGrid from '../components/ui/StapleGrid'
import NearbyBranches from '../components/ui/NearbyBranches'
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

      {/* One live order indicator, not two. LiveOrderPill sat beside this and
          drew a second chip for the same order whenever a signed-in customer
          had ordered from the phone in their hand, which is the normal case.
          GreetingBar's own chip works for guests as well and carries the
          tracking token, so it is the one that stayed. */}
      <div className='page-x pt-5 pb-4 md:pt-8'>
        <GreetingBar />
      </div>

      <HomeHero />

      <div className='mt-10'>
        <PromoBanner />
      </div>

      <div className='mt-12'>
        <StapleGrid />
      </div>

      <div className='mt-14'>
        <NearbyBranches />
      </div>

      {/* The footer knows which device it is on. A phone gets a way to reach
          somebody rather than a site map, because the tab bar is already the
          way around. See Footer.tsx. */}
      <Footer className='mt-16' />
    </div>
  )
}
