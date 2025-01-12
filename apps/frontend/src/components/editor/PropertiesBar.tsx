import React, { useState } from "react";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  HighlighterIcon,
  ParkingSquareIcon,
} from "lucide-react";

import { CharacterProperties } from "../../sync/sync";

interface PropertiesBarProps {
  onPropertiesChange: (properties: CharacterProperties) => void;
}

const PropertiesBar = ({ onPropertiesChange }: PropertiesBarProps) => {
  const [properties, setProperties] = useState<CharacterProperties>({});

  const toggleProperty = (key: keyof CharacterProperties) => {
    setProperties((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

    //cant do this as it will not update the properties state immediately

    onPropertiesChange({
        ...properties,
        [key]: !properties[key],
    });
  };

  return (
    <div className="flex items-center justify-center gap-4 p-4 text-white ">
      <button
        onClick={() => toggleProperty("bold")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.bold ? "bg-white text-black" : ""
        }`}
      >
        <Bold />
      </button>
      <button
        onClick={() => toggleProperty("italic")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.italic ? "bg-white text-black" : ""
        }`}
      >
        <Italic />
      </button>
      <button
        onClick={() => toggleProperty("underline")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.underline ? "bg-white text-black" : ""
        }`}
      >
        <Underline />
      </button>
      <button
        onClick={() => toggleProperty("strikethrough")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.strikethrough ? "bg-white text-black" : ""
        }`}
      >
        <Strikethrough />
      </button>
      <button
        onClick={() => toggleProperty("heading")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.heading ? "bg-white text-black" : ""
        }`}
      >
        <Heading />
      </button>
      <button
        onClick={() => toggleProperty("highlight")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.highlight ? "bg-white text-black" : ""
        }`}
      >
        <HighlighterIcon />
      </button>
      <button>
        <ParkingSquareIcon />
      </button>
      <button
        onClick={() => toggleProperty("left")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.left ? "bg-white text-black" : ""
        }`}
      >
        Left
      </button>
      <button
        onClick={() => toggleProperty("center")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.center ? "bg-white text-black" : ""
        }`}
      >
        Center
      </button>
      <button
        onClick={() => toggleProperty("right")}
        className={`hover:bg-white hover:text-black active:bg-white active:text-black ${
          properties.right ? "bg-white text-black" : ""
        }`}
      >
        Right
      </button>
    </div>
  );
};

export default PropertiesBar;
