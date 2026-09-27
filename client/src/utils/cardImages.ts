const cardFaceImages: Partial<Record<number, string>> = {
  0: '/images/card0.jpeg',
  3: '/images/card3.jpeg',
  4: '/images/card4.jpeg',
  10: '/images/card10.jpeg',
  11: '/images/card11.jpeg',
};

export const getCardFaceImage = (value: number) => cardFaceImages[value];

