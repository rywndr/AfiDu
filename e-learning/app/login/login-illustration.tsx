import Image from 'next/image';

type Illustration = {
  readonly src: string;
  readonly alt: string;
};

const ILLUSTRATIONS: readonly [Illustration, ...Illustration[]] = [
  { src: '/login_img.webp', alt: 'A student sitting in a chair, working on a laptop' },
  { src: '/login_img2.webp', alt: 'A student sitting in an armchair, working on a laptop' },
];

function pickIllustration(): Illustration {
  return ILLUSTRATIONS[Math.floor(Math.random() * ILLUSTRATIONS.length)];
}

export function LoginIllustration() {
  const { src, alt } = pickIllustration();

  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={400}
      priority
      className="h-auto w-full max-w-[15rem] object-contain"
    />
  );
}
