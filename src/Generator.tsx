import { useState } from "react";
import { generateLabels } from "./generate";
import {
  Button,
  Checkbox,
  Group,
  Input,
  Stack,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";

export default function Generator() {
  const [itemIds, setItemIds] = useState<string>("");
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [skipFirstChecked, setSkipFirstChecked] = useState<boolean>(false);
  const [skipFirst, setSkipFirst] = useState<number | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [prefix, setPrefix] = useState<string>("CHTL");

  const fillOutIds = (inputText: string): number[] => {
    const ids: number[] = [];

    if (skipFirstChecked && skipFirst) {
      // Skip the first N labels
      ids.push(...Array.from({ length: skipFirst }, () => -1));
    }

    const tokens = inputText
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    for (const token of tokens) {
      if (/^-?\d+\s*-\s*-?\d+$/.test(token)) {
        const [startStr, endStr] = token.split("-").map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          const step = start <= end ? 1 : -1;
          for (let n = start; step > 0 ? n <= end : n >= end; n += step) {
            ids.push(n);
          }
        }
      } else {
        const n = parseInt(token, 10);
        if (!Number.isNaN(n)) ids.push(n);
      }
    }
    return ids;
  };

  const onGenerate = async () => {
    setIsGenerating(true);
    const doc = await generateLabels(prefix, fillOutIds(itemIds));
    const pdfBytes = new Uint8Array(await doc.save());
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setFileData(url);
    setIsGenerating(false);
  };

  useHotkeys([["mod+Enter", onGenerate]], []);

  return (
    <Group grow m="md" align="flex-start">
      <Stack>
        <Title>Label Generator</Title>
        <TextInput
          label="Prefix"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
        />
        <Textarea
          label="Item IDs"
          value={itemIds}
          onChange={(e) => setItemIds(e.target.value)}
        />
        <Group align="center">
          <Checkbox
            checked={skipFirstChecked}
            onChange={(e) => setSkipFirstChecked(e.currentTarget.checked)}
          />
          Skip first{" "}
          <Input
            type="number"
            size="xs"
            value={skipFirst}
            onChange={(e) =>
              setSkipFirst(parseInt(e.target.value, 10) || undefined)
            }
          />
          labels
        </Group>

        <Button
          onClick={onGenerate}
          loading={isGenerating}
          disabled={isGenerating}
        >
          Generate Labels
        </Button>
      </Stack>
      <object
        data={fileData}
        type="application/pdf"
        width="100%"
        height="800px"
      >
        <p>
          Your browser does not support PDFs.{" "}
          <a href={fileData}>Download the PDF</a>.
        </p>
      </object>
    </Group>
  );
}
