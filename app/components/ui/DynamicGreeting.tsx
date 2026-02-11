
'use client';

import { useEffect, useState } from 'react';
import { useBranch } from '../providers/BranchProvider';


export default function DynamicGreeting() {
    const { selectedBranch } = useBranch();
    const [greeting, setGreeting] = useState('Good Evening!');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning!');
        else if (hour < 17) setGreeting('Good Afternoon!');
        else setGreeting('Good Evening!');
    }, []);


    return (
        <div>
            {/* Left: Greeting */}
            <div className="shrink-0 flex justify-center p-6 rounded-xl ">
                <div>
                    <h2 className="text-lg font-family-body md:text-3xl w-auto font-bold text-primary mb-">
                        {greeting}
                    </h2>
                    <p className="text-base md:text-lg font-medium text-text-dark dark:text-text-light">
                        What Would you like?{' '}
                    </p>
                </div>

            </div>


        </div>
    )
}
