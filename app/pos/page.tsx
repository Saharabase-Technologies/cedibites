'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BackspaceIcon,
  ArrowRightIcon,
  StorefrontIcon,
  UserIcon,
  SpinnerIcon
} from '@phosphor-icons/react';
import { BRANCHES, Branch } from '@/app/components/providers/BranchProvider';
import { resolveByPin } from '@/lib/data/mockStaff';
import { usePOS } from './context';

type LoginStep = 'pin' | 'branch';

export default function POSLoginPage() {
  const router = useRouter();
  const { login } = usePOS();
  const [step, setStep] = useState<LoginStep>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ id: string; name: string; branches: string[] } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // Auto-submit when PIN is 4 digits
  const pinLength = 4;

  const handlePinInput = useCallback((digit: string) => {
    if (pin.length >= pinLength) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto-verify when complete
    if (newPin.length === pinLength) {
      verifyPin(newPin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, []);

  const verifyPin = async (pinToVerify: string) => {
    setIsLoading(true);

    // Simulate API delay - replace with real auth
    await new Promise(resolve => setTimeout(resolve, 300));

    const staff = resolveByPin(pinToVerify);

    if (staff) {
      setStaffInfo({ id: staff.id, name: staff.name, branches: staff.branchIds });

      // If staff only has one branch, auto-select and proceed
      if (staff.branchIds.length === 1) {
        proceedToTerminal(staff.branchIds[0], staff.id, staff.name);
      } else {
        setStep('branch');
      }
    } else {
      setError('Invalid PIN');
      setPin('');
    }

    setIsLoading(false);
  };

  const proceedToTerminal = (branchId: string, staffId: string, staffName: string) => {
    login({ staffId, branchId, staffName, loginTime: Date.now() });
    router.push('/pos/terminal');
  };

  const handleBranchSelect = (branchId: string) => {
    setSelectedBranch(branchId);
  };

  const handleBranchConfirm = () => {
    if (selectedBranch && staffInfo) {
      proceedToTerminal(selectedBranch, staffInfo.id, staffInfo.name);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 'pin') return;

      if (e.key >= '0' && e.key <= '9') {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, handlePinInput, handleBackspace]);

  return (
    <div className="min-h-dvh bg-neutral-card flex flex-col items-center justify-center p-6 bg-neutral-ligh">
      {/* Logo */}
      <div className="mb-8">
        {/* <Image
          src="/cblogo.webp"
          alt="CediBites"
          width={120}
          height={40}
          priority
        /> */}
      </div>

      {step === 'pin' ? (
        <PinEntryView
          pin={pin}
          pinLength={pinLength}
          error={error}
          isLoading={isLoading}
          onPinInput={handlePinInput}
          onBackspace={handleBackspace}
        />
      ) : (
        <BranchSelectView
          staffName={staffInfo?.name || ''}
          branches={BRANCHES.filter(b => staffInfo?.branches.includes(b.id))}
          selectedBranch={selectedBranch}
          onSelect={handleBranchSelect}
          onConfirm={handleBranchConfirm}
          onBack={() => {
            setStep('pin');
            setPin('');
            setStaffInfo(null);
            setSelectedBranch(null);
          }}
        />
      )}
    </div>
  );
}

// PIN Entry Component
interface PinEntryProps {
  pin: string;
  pinLength: number;
  error: string;
  isLoading: boolean;
  onPinInput: (digit: string) => void;
  onBackspace: () => void;
}

function PinEntryView({ pin, pinLength, error, isLoading, onPinInput, onBackspace }: PinEntryProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div className="w-full max-w-sm">
      {/* Title */}
      <h1 className="text-2xl font-medium text-center text-text-dark mb-2">
        Enter PIN
      </h1>
      <p className="text-neutral-gray text-center mb-8">
        Use your 4-digit staff PIN
      </p>

      {/* PIN Dots */}
      <div className="flex justify-center gap-4 mb-8">
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={`
              w-4 h-4 rounded-full transition-all duration-150
              ${i < pin.length
                ? 'bg-primary scale-110'
                : 'bg-neutral-gray/25'
              }
              ${error && 'animate-shake bg-error'}
            `}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-error text-center text-sm mb-4 animate-fadeIn">
          {error}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center mb-4">
          <SpinnerIcon className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit, i) => {
          if (digit === '') {
            return <div key={i} />;
          }

          if (digit === 'back') {
            return (
              <button
                key={i}
                onClick={onBackspace}
                disabled={isLoading || pin.length === 0}
                className="
                  h-16 rounded-2xl flex items-center justify-center
                  bg-white text-text-dark border border-neutral-gray/20 shadow-sm
                  active:bg-neutral-gray/10 active:scale-95
                  disabled:opacity-40 disabled:active:scale-100
                  transition-all duration-100
                "
              >
                <BackspaceIcon className="w-7 h-7" />
              </button>
            );
          }

          return (
            <button
              key={i}
              onClick={() => onPinInput(digit)}
              disabled={isLoading}
              className="
                h-16 rounded-2xl text-2xl font-medium
                bg-white text-text-dark border border-neutral-gray/20 shadow-sm
                active:bg-primary active:text-brown active:border-primary active:scale-95
                disabled:opacity-40
                transition-all duration-100
              "
            >
              {digit}
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <p className="text-neutral-gray/60 text-center text-sm mt-8">
        Contact admin if you forgot your PIN
      </p>
    </div>
  );
}

// Branch Select Component
interface BranchSelectProps {
  staffName: string;
  branches: Branch[];
  selectedBranch: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

function BranchSelectView({
  staffName,
  branches,
  selectedBranch,
  onSelect,
  onConfirm,
  onBack
}: BranchSelectProps) {
  return (
    <div className="w-full max-w-md">
      {/* Staff greeting */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-lg text-text-dark">
          Welcome, <span className="font-medium">{staffName}</span>
        </span>
      </div>

      <h2 className="text-xl text-center text-neutral-gray mb-6">
        Select your branch
      </h2>

      {/* Branch list */}
      <div className="space-y-3 mb-8">
        {branches.map(branch => (
          <button
            key={branch.id}
            onClick={() => onSelect(branch.id)}
            className={`
              w-full p-4 rounded-2xl text-left transition-all duration-150
              flex items-center gap-4
              ${selectedBranch === branch.id
                ? 'bg-primary text-brown ring-2 ring-primary ring-offset-2 ring-offset-neutral-light'
                : 'bg-white text-text-dark border border-neutral-gray/20 shadow-sm hover:bg-neutral-light'
              }
            `}
          >
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${selectedBranch === branch.id ? 'bg-brown/20' : 'bg-neutral-gray/10'}
            `}>
              <StorefrontIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-lg">{branch.name}</p>
              <p className={`text-sm ${selectedBranch === branch.id ? 'text-brown/70' : 'text-neutral-gray'}`}>
                {branch.address}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="
            flex-1 h-14 rounded-2xl font-medium
            bg-neutral-gray/10 text-text-dark border border-neutral-gray/20
            hover:bg-neutral-gray/20 active:scale-[0.98]
            transition-all duration-150
          "
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={!selectedBranch}
          className="
            flex-1 h-14 rounded-2xl font-medium
            bg-primary text-brown
            hover:bg-primary-hover active:scale-[0.98]
            disabled:opacity-40 disabled:active:scale-100
            transition-all duration-150
            flex items-center justify-center gap-2
          "
        >
          Continue
          <ArrowRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
