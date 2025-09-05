import { useState } from "react";
import { generateLabels } from "./generate";
import {
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconCheck, IconCommand, IconTagFilled } from "@tabler/icons-react";

export default function Generator() {
  const [itemIds, setItemIds] = useState<string>("");
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [skipFirst, setSkipFirst] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [prefix, setPrefix] = useState<string>("CHTL");
  const [repeatCount, setRepeatCount] = useState<number>(1);

  const fillOutIds = (inputText: string): number[] => {
    const ids: number[] = [];

    // Skip the first N labels
    ids.push(...Array.from({ length: skipFirst }, () => -1));

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
            for (let i = 0; i < repeatCount; i++) {
              ids.push(n);
            }
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
        <Title>
          <IconTagFilled /> Label Generator
        </Title>
        <TextInput
          label="Prefix"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
        />
        <NumberInput
          label="Repeat Count"
          description="Number of times to repeat each ID"
          value={repeatCount}
          min={1}
          hideControls
          onChange={(value) => {
            if (typeof value === "number") setRepeatCount(value);
          }}
        />
        <Textarea
          label="Item IDs"
          description="Comma-separated list of item IDs or ranges"
          placeholder="e.g., 1-10,17,23"
          value={itemIds}
          onChange={(e) => setItemIds(e.target.value)}
        />
        <NumberInput
          label="Skip First"
          description="Number of labels to skip on sheet"
          value={skipFirst}
          min={0}
          hideControls
          onChange={(value) => {
            if (typeof value === "number") setSkipFirst(value);
          }}
        />
        <Button
          onClick={onGenerate}
          loading={isGenerating}
          disabled={isGenerating}
          leftSection={<IconCheck />}
        >
          Generate Labels
        </Button>
      </Stack>
      <div>
        <object
          data={fileData}
          type="application/pdf"
          style={{ width: "100%", height: "calc(100vh - 50px)" }}
        >
          <p>
            Your browser does not support PDFs.{" "}
            <a href={fileData}>Download the PDF</a>.
          </p>
        </object>
      </div>
    </Group>
  );
}
