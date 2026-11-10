'use client';

import { useState } from 'react';
import { SteeringLoader } from './steering-loader';
import styles from './loading-car-image.module.css';

type Props = { src: string; alt: string; loading?: 'lazy' | 'eager' };

export function LoadingCarImage(props: Props) {
  // A new source gets its own loading state, including rapid gallery navigation.
  return <CarImage key={props.src} {...props} />;
}

function CarImage({ src, alt, loading }: Props) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <img
        src={failed ? '/cars/placeholder.svg' : src}
        alt={alt}
        loading={loading}
        ref={(image) => {
          if (image?.complete) {
            setReady(true);
            if (!image.naturalWidth) setFailed(true);
          }
        }}
        onLoad={() => setReady(true)}
        onError={() => {
          setFailed(true);
          setReady(true);
        }}
      />
      {!ready && (
        <span className={styles.overlay}>
          <SteeringLoader label="Loading photo…" />
        </span>
      )}
    </>
  );
}
