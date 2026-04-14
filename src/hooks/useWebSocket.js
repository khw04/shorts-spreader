'use client';

import { useEffect, useState } from 'react';

export function useWebSocket(url) {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!url) {
      setStatus('idle');
      return undefined;
    }

    setStatus('placeholder');

    return () => {
      setStatus('closed');
    };
  }, [url]);

  return { status };
}
