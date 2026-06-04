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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";

import { useSkillList } from "../api/use-skill-list";

interface SkillFormViewProps {
  status: string;
  onSubmit: (input: CreateSkillInput) => Promise<void>;
}

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
  const existingSkillNames = useMemo(
    () => new Set((skillList.data ?? []).map((skill) => skill.name)),
    [skillList.data]
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
  }, [existingSkillNames, form]);

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
      <header className="border-b border-border bg-background px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <Button
              variant="ghost"
              size="icon"
              render={<Link to="/skills" aria-label="Back" />}
            >
              <ArrowLeftIcon />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight md:text-2xl">
                Create Skill
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <p className="text-sm text-muted-foreground">{submitStatus}</p>
            <Button
              type="submit"
              form={skillFormId}
              className="w-full md:w-auto"
              disabled={isSubmitDisabled}
            >
              Create Skill
            </Button>
          </div>
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
          className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-6"
        >
          <FieldGroup className="border-b border-border pb-6">
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
          </FieldGroup>

          <FieldGroup>
            <Field data-invalid={Boolean(contentError)}>
              <FieldLabel htmlFor="skill-content">SKILL.md</FieldLabel>
              <Textarea
                id="skill-content"
                aria-label="SKILL.md"
                aria-invalid={Boolean(contentError)}
                className="min-h-[28rem]"
                placeholder="# Skill instructions&#10;&#10;Use this skill when..."
                {...form.register("content")}
              />
              <FieldError errors={[contentError]} />
            </Field>
          </FieldGroup>
        </form>
      </OverlayScrollbarsComponent>
    </>
  );
};
