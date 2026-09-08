import React from "react";

type Props = {
  height?: string;
  width?: string;
  className?: string;
};

export const Spacer: React.FC<Props> = ({
  height,
  width,
  className,
}: Props) => {
  return <div style={{ height, width }} className={className} />;
};
