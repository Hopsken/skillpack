import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateSkillInput } from "@skillpack/contracts/skills/requests";
import {
  skillDescriptionSchema,
  skillNameSchema,
} from "@skillpack/core/primitives";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useSkillList } from "../api/use-skill-list";

interface SkillFormViewProps {
  status: string;
  onSubmit: (input: CreateSkillInput) => Promise<void>;
}

const textAreaClassName =
  "min-h-32 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const skillFormId = "skill-form";

const skillFormSchema = z.object({
  content: z.string().min(1, "SKILL.md is required"),
  description: skillDescriptionSchema,
  skillName: skillNameSchema,
});

type SkillFormInput = z.infer<typeof skillFormSchema>;

export const SkillFormView = ({ status, onSubmit }: SkillFormViewProps) => {
  const [submitStatus, setSubmitStatus] = useState(status);
  const skillList = useSkillList();
  const skills = skillList.data ?? [];
  const skillNameKey = skills.map((listItem) => listItem.name).join("\0");
  const existingSkillNames = useMemo(
    () => new Set(skillNameKey ? skillNameKey.split("\0") : []),
    [skillNameKey]
  );
  const formSchema = useMemo(
    () =>
      skillFormSchema.refine(
        (input) => !existingSkillNames.has(input.skillName),
        {
          message: "Skill name already exists",
          path: ["skillName"],
        }
      ),
    [existingSkillNames]
  );
  const form = useForm<SkillFormInput>({
    defaultValues: {
      content: "",
      description: "",
      skillName: "",
    },
    mode: "onChange",
    resolver: zodResolver(formSchema),
  });

  const nameError = form.formState.errors.skillName;
  const descriptionError = form.formState.errors.description;
  const contentError = form.formState.errors.content;
  const showNameWarning = Boolean(
    nameError && form.formState.dirtyFields.skillName
  );
  const isSubmitDisabled =
    form.formState.isSubmitting ||
    !form.formState.isValid ||
    skillList.isPending;

  useEffect(() => {
    void form.trigger("skillName");
  }, [form, skillNameKey]);

  const submit = async (input: SkillFormInput) => {
    setSubmitStatus("Saving...");

    try {
      await onSubmit({
        allowedTools: null,
        changeSummary: undefined,
        compatibility: null,
        content: input.content,
        description: input.description,
        license: null,
        metadata: null,
        name: input.skillName,
        resources: [],
        versionLabel: undefined,
      });

      setSubmitStatus("Saved");
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "Save failed");
    }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            render={<Link to="/skills" aria-label="Back" />}
          >
            <ArrowLeftIcon />
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Create Skill
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-sm text-muted-foreground">{submitStatus}</p>
          <Button type="submit" form={skillFormId} disabled={isSubmitDisabled}>
            Create
          </Button>
        </div>
      </header>

      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 flex-1"
      >
        <form
          id={skillFormId}
          onSubmit={form.handleSubmit(submit)}
          className="mx-auto grid w-full max-w-3xl gap-6 p-6"
        >
          <section className="grid gap-5 border-b border-border pb-6">
            <Field data-invalid={showNameWarning}>
              <FieldLabel htmlFor="skill-name">Skill Name</FieldLabel>
              <Input
                id="skill-name"
                aria-invalid={showNameWarning}
                autoComplete="off"
                placeholder="skill-name"
                {...form.register("skillName")}
              />
              <FieldError errors={[showNameWarning ? nameError : undefined]} />
            </Field>
            <Field data-invalid={Boolean(descriptionError)}>
              <FieldLabel htmlFor="skill-description">Description</FieldLabel>
              <Input
                id="skill-description"
                aria-invalid={Boolean(descriptionError)}
                placeholder="What should this skill help with?"
                {...form.register("description")}
              />
              <FieldError errors={[descriptionError]} />
            </Field>
          </section>

          <Field data-invalid={Boolean(contentError)}>
            <FieldLabel htmlFor="skill-content">SKILL.md</FieldLabel>
            <textarea
              id="skill-content"
              aria-label="SKILL.md"
              aria-invalid={Boolean(contentError)}
              className={`${textAreaClassName} min-h-[28rem] font-mono leading-relaxed`}
              placeholder="# Skill instructions&#10;&#10;Use this skill when..."
              {...form.register("content")}
            />
            <FieldError errors={[contentError]} />
          </Field>
        </form>
      </OverlayScrollbarsComponent>
    </>
  );
};
