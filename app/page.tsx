'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import Button from './components/base/Button'
import Navbar from './components/layout/Navbar'
import Loader from './components/base/Loader'
import { sampleMenuItems } from '@/lib/data/SampleMenu'
import UniversalSearch from './components/ui/UniversalSearch'
import DynamicGreeting from './components/ui/DynamicGreeting'






export default function page() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const SearchCategoryItems = [
    {
      id: '1',
      label: 'All Items'
    },
    {
      id: '2',
      label: 'Main Dishes'
    },
    {
      id: '3',
      label: 'Appetizers'
    },
    {
      id: '4',
      label: 'Desserts'
    },
    {
      id: '5',
      label: 'Drinks'
    },
  ]



  if (isLoading) {
    return <Loader fullScreen size="xl" text="Finding Best Branch" variant="primary" />;
  }
  return (
    <div className=' bg-image  min-h-screen'>
      <Navbar />

      <div className='w-[95%]  border-b border-neutral-gray/20  md:w-[80%] my-2 p- xl:w-[70%]  mx-auto flex items-center justify-between'>
        <div className='shrink-0  '>
          <DynamicGreeting />
        </div>
        <UniversalSearch items={sampleMenuItems} />
      </div>

      <div className='w-[95%] py-2 md:w-[80%] xl:w-[70%] gap mx-auto'>


        <div className='gap-4 flex items-center justify-start flex-wrap'>
          {SearchCategoryItems.map((item) => (

            <button
              key={item.id}
              onClick={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}
              className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium text-text-dark dark:text-text-light transition-all border border-primary
                ${selectedItemId === item.id
                  ? 'bg-primary text-text-light'
                  : ' hover:bg-primary/20'
                }`}
            >
              <p>{item.label}</p>
            </button>
          ))}
        </div>




      </div>





    </div>
  )
}
