"use client"

import * as React from "react"
import { enUS } from "date-fns/locale"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  ArrowRightIcon,
  BellIcon,
  BoldIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CloudIcon,
  CopyIcon,
  CreditCardIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  ItalicIcon,
  LogOutIcon,
  MailIcon,
  MoonIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SmileIcon,
  SunIcon,
  TrashIcon,
  UnderlineIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { AspectRatio } from "@workspace/ui/components/aspect-ratio"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@workspace/ui/components/button-group"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/carousel"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@workspace/ui/components/chart"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@workspace/ui/components/command"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { DirectionProvider } from "@workspace/ui/components/direction"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@workspace/ui/components/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@workspace/ui/components/hover-card"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@workspace/ui/components/input-otp"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item"
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd"
import { Label } from "@workspace/ui/components/label"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@workspace/ui/components/menubar"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@workspace/ui/components/popover"
import { Progress, ProgressLabel, ProgressValue } from "@workspace/ui/components/progress"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@workspace/ui/components/resizable"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Slider } from "@workspace/ui/components/slider"
import { Toaster } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import { Toggle } from "@workspace/ui/components/toggle"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"

type SectionProps = {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}

function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-start gap-6 py-4">
          {children}
        </CardContent>
      </Card>
    </section>
  )
}

function Demo({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-w-[12rem] flex-col gap-2 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

const COMBOBOX_ITEMS = ["apple", "banana", "cherry", "date", "elderberry"]

const CHART_DATA = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 273, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 264, mobile: 140 },
]

const CHART_CONFIG = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig

export default function PlaygroundPage() {
  const [progress, setProgress] = React.useState(45)
  const [slider, setSlider] = React.useState<number[]>([50])
  const [otp, setOtp] = React.useState("")
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [bookmarked, setBookmarked] = React.useState(true)

  return (
    <TooltipProvider>
      <DirectionProvider direction="ltr">
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">
                  Components Playground
                </h1>
                <p className="text-sm text-muted-foreground">
                  Every shadcn UI component in this workspace, in one place.
                </p>
              </div>
              <Badge variant="secondary">base-nova</Badge>
            </div>
          </header>

          <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
            {/* ============================ BUTTONS ============================ */}
            <Section id="buttons" title="Button" description="Variants and sizes.">
              <Demo label="Variants">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </Demo>
              <Demo label="Sizes">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Add">
                  <PlusIcon />
                </Button>
              </Demo>
              <Demo label="Disabled / Loading">
                <Button disabled>Disabled</Button>
                <Button disabled>
                  <Spinner />
                  Loading
                </Button>
              </Demo>
            </Section>

            <Section id="button-group" title="Button Group">
              <Demo label="Connected">
                <ButtonGroup>
                  <Button variant="outline">
                    <BoldIcon />
                  </Button>
                  <Button variant="outline">
                    <ItalicIcon />
                  </Button>
                  <Button variant="outline">
                    <UnderlineIcon />
                  </Button>
                </ButtonGroup>
              </Demo>
              <Demo label="With separator and text">
                <ButtonGroup>
                  <Button variant="outline">Previous</Button>
                  <ButtonGroupSeparator />
                  <ButtonGroupText>Page 3</ButtonGroupText>
                  <ButtonGroupSeparator />
                  <Button variant="outline">Next</Button>
                </ButtonGroup>
              </Demo>
            </Section>

            <Section id="toggle" title="Toggle & Toggle Group">
              <Demo label="Toggle">
                <Toggle aria-label="Toggle bold">
                  <BoldIcon />
                </Toggle>
                <Toggle variant="outline" aria-label="Toggle italic">
                  <ItalicIcon />
                </Toggle>
              </Demo>
              <Demo label="Toggle Group">
                <ToggleGroup defaultValue={["bold"]} aria-label="Text formatting">
                  <ToggleGroupItem value="bold" aria-label="Bold">
                    <BoldIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="italic" aria-label="Italic">
                    <ItalicIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="underline" aria-label="Underline">
                    <UnderlineIcon />
                  </ToggleGroupItem>
                </ToggleGroup>
              </Demo>
            </Section>

            {/* ============================ INDICATORS ============================ */}
            <Section id="badge" title="Badge">
              <Demo label="Variants">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </Demo>
            </Section>

            <Section id="alert" title="Alert">
              <div className="w-full max-w-xl space-y-3">
                <Alert>
                  <CircleAlertIcon />
                  <AlertTitle>Heads up</AlertTitle>
                  <AlertDescription>
                    You can add components to your app using the CLI.
                  </AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <CircleAlertIcon />
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription>
                    Your session has expired. Please log in again.
                  </AlertDescription>
                  <AlertAction>
                    <Button size="sm" variant="outline">
                      Retry
                    </Button>
                  </AlertAction>
                </Alert>
              </div>
            </Section>

            <Section id="progress" title="Progress">
              <div className="w-full max-w-md space-y-4">
                <Progress value={progress} locale="en-US">
                  <ProgressLabel>Uploading</ProgressLabel>
                  <ProgressValue />
                </Progress>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgress((p) => Math.max(0, p - 10))}
                  >
                    −10
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgress((p) => Math.min(100, p + 10))}
                  >
                    +10
                  </Button>
                </div>
              </div>
            </Section>

            <Section id="skeleton" title="Skeleton">
              <div className="flex w-full max-w-md items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </Section>

            <Section id="spinner" title="Spinner">
              <Demo label="Sizes">
                <Spinner />
                <Spinner className="size-6" />
                <Spinner className="size-8" />
              </Demo>
            </Section>

            <Section id="kbd" title="Kbd">
              <Demo label="Single">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </Demo>
              <Demo label="Group">
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>P</Kbd>
                </KbdGroup>
              </Demo>
            </Section>

            {/* ============================ FORMS ============================ */}
            <Section id="input" title="Input">
              <Demo label="Basic">
                <Input placeholder="Email" type="email" className="w-64" />
              </Demo>
              <Demo label="Disabled">
                <Input disabled placeholder="Disabled" className="w-64" />
              </Demo>
            </Section>

            <Section id="input-group" title="Input Group">
              <div className="w-full max-w-sm space-y-3">
                <InputGroup>
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput placeholder="Search components..." />
                </InputGroup>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>https://</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput placeholder="example.com" />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="xs" variant="ghost">
                      <CopyIcon />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </Section>

            <Section id="input-otp" title="Input OTP">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </Section>

            <Section id="textarea" title="Textarea">
              <Textarea placeholder="Type your message..." className="w-full max-w-md" />
            </Section>

            <Section id="label" title="Label">
              <div className="flex items-center gap-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">Accept terms and conditions</Label>
              </div>
            </Section>

            <Section id="checkbox" title="Checkbox">
              <Demo label="States">
                <div className="flex items-center gap-2">
                  <Checkbox id="cb1" defaultChecked />
                  <Label htmlFor="cb1">Checked</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="cb2" />
                  <Label htmlFor="cb2">Unchecked</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="cb3" disabled />
                  <Label htmlFor="cb3">Disabled</Label>
                </div>
              </Demo>
            </Section>

            <Section id="radio-group" title="Radio Group">
              <RadioGroup defaultValue="comfortable">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="default" id="r1" />
                  <Label htmlFor="r1">Default</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="comfortable" id="r2" />
                  <Label htmlFor="r2">Comfortable</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="compact" id="r3" />
                  <Label htmlFor="r3">Compact</Label>
                </div>
              </RadioGroup>
            </Section>

            <Section id="switch" title="Switch">
              <div className="flex items-center gap-2">
                <Switch id="notifications" defaultChecked />
                <Label htmlFor="notifications">Enable notifications</Label>
              </div>
            </Section>

            <Section id="slider" title="Slider">
              <div className="w-full max-w-md">
                <Slider
                  value={slider}
                  onValueChange={(v) => setSlider(Array.isArray(v) ? [...v] : [v])}
                  max={100}
                  step={1}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Value: {slider[0]}
                </p>
              </div>
            </Section>

            <Section id="select" title="Select">
              <Select>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Fruits</SelectLabel>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="cherry">Cherry</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Vegetables</SelectLabel>
                    <SelectItem value="carrot">Carrot</SelectItem>
                    <SelectItem value="potato">Potato</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Section>

            <Section id="native-select" title="Native Select">
              <NativeSelect className="w-56" defaultValue="apple">
                <NativeSelectOption value="apple">Apple</NativeSelectOption>
                <NativeSelectOption value="banana">Banana</NativeSelectOption>
                <NativeSelectOption value="cherry">Cherry</NativeSelectOption>
              </NativeSelect>
            </Section>

            <Section id="combobox" title="Combobox">
              <Combobox items={COMBOBOX_ITEMS}>
                <ComboboxInput placeholder="Pick a fruit..." className="w-64" />
                <ComboboxContent>
                  <ComboboxEmpty>No fruit found.</ComboboxEmpty>
                  <ComboboxList>
                    {COMBOBOX_ITEMS.map((item) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Section>

            <Section id="field" title="Field / FieldSet">
              <FieldSet className="w-full max-w-md">
                <FieldLegend>Account</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="f-name">Name</FieldLabel>
                    <Input id="f-name" placeholder="John Doe" />
                    <FieldDescription>Your full legal name.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="f-email">Email</FieldLabel>
                    <Input id="f-email" type="email" placeholder="you@example.com" />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </Section>

            {/* ============================ OVERLAYS ============================ */}
            <Section id="dialog" title="Dialog">
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  Open Dialog
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                      Make changes to your profile here. Click save when you&apos;re done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue="Pedro Duarte" />
                  </div>
                  <DialogFooter showCloseButton>
                    <Button>Save changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Section>

            <Section id="alert-dialog" title="Alert Dialog">
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  Delete account
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel render={<Button variant="outline" />}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction render={<Button variant="destructive" />}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Section>

            <Section id="sheet" title="Sheet">
              <Sheet>
                <SheetTrigger render={<Button variant="outline" />}>
                  Open Sheet
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Edit profile</SheetTitle>
                    <SheetDescription>
                      Make changes to your profile here.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-2 p-4">
                    <Label htmlFor="sheet-name">Name</Label>
                    <Input id="sheet-name" defaultValue="Pedro Duarte" />
                  </div>
                  <SheetFooter>
                    <SheetClose render={<Button />}>Save</SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </Section>

            <Section id="drawer" title="Drawer">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline">Open Drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Move goal</DrawerTitle>
                    <DrawerDescription>Set your daily activity target.</DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4">
                    <Slider defaultValue={[50]} max={100} step={1} />
                  </div>
                  <DrawerFooter>
                    <Button>Submit</Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </Section>

            <Section id="popover" title="Popover">
              <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>
                  Open Popover
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <PopoverHeader>
                    <PopoverTitle>Dimensions</PopoverTitle>
                    <PopoverDescription>
                      Set the dimensions for the layer.
                    </PopoverDescription>
                  </PopoverHeader>
                  <div className="grid gap-2 pt-2">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label htmlFor="width">Width</Label>
                      <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label htmlFor="height">Height</Label>
                      <Input id="height" defaultValue="25px" className="col-span-2 h-8" />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </Section>

            <Section id="hover-card" title="Hover Card">
              <HoverCard>
                <HoverCardTrigger render={<Button variant="link" />}>
                  @shadcn
                </HoverCardTrigger>
                <HoverCardContent className="w-72">
                  <div className="flex gap-3">
                    <Avatar>
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">@shadcn</p>
                      <p className="text-sm text-muted-foreground">
                        Designer & developer. Author of shadcn/ui.
                      </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </Section>

            <Section id="tooltip" title="Tooltip">
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" />}>
                  Hover me
                </TooltipTrigger>
                <TooltipContent>Add to library</TooltipContent>
              </Tooltip>
            </Section>

            <Section id="dropdown-menu" title="Dropdown Menu">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  Open Menu
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserIcon />
                    Profile
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCardIcon />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <SettingsIcon />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={bookmarked}
                    onCheckedChange={setBookmarked}
                  >
                    Bookmarked
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <LogOutIcon />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Section>

            <Section id="context-menu" title="Context Menu">
              <ContextMenu>
                <ContextMenuTrigger
                  render={
                    <div className="flex h-32 w-72 cursor-default items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground" />
                  }
                >
                  Right-click here
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                  <ContextMenuLabel>Actions</ContextMenuLabel>
                  <ContextMenuSeparator />
                  <ContextMenuItem>
                    Back
                    <ContextMenuShortcut>⌘[</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem>
                    Forward
                    <ContextMenuShortcut>⌘]</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuCheckboxItem defaultChecked>
                    Show sidebar
                  </ContextMenuCheckboxItem>
                </ContextMenuContent>
              </ContextMenu>
            </Section>

            <Section id="menubar" title="Menubar">
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>File</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      New Tab <MenubarShortcut>⌘T</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      New Window <MenubarShortcut>⌘N</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Share</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Print</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>Edit</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Undo</MenubarItem>
                    <MenubarItem>Redo</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </Section>

            {/* ============================ NAVIGATION ============================ */}
            <Section id="tabs" title="Tabs">
              <Tabs defaultValue="account" className="w-full max-w-md">
                <TabsList>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account</CardTitle>
                      <CardDescription>
                        Update your account details.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Label htmlFor="t-name">Name</Label>
                      <Input id="t-name" defaultValue="Pedro Duarte" />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="password">
                  <Card>
                    <CardHeader>
                      <CardTitle>Password</CardTitle>
                      <CardDescription>Change your password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Label htmlFor="t-pwd">New password</Label>
                      <Input id="t-pwd" type="password" />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </Section>

            <Section id="navigation-menu" title="Navigation Menu">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-72 gap-2 p-3">
                        <li>
                          <NavigationMenuLink>Introduction</NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink>Installation</NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink>Typography</NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink>Docs</NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </Section>

            <Section id="breadcrumb" title="Breadcrumb">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Components</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </Section>

            <Section id="pagination" title="Pagination">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>
                      2
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </Section>

            <Section id="sidebar" title="Sidebar" description="An embedded sidebar demo.">
              <div className="h-72 w-full overflow-hidden rounded-lg border">
                <SidebarProvider className="!min-h-full">
                  <Sidebar collapsible="none" className="border-r">
                    <SidebarHeader>
                      <span className="px-2 py-1 text-sm font-semibold">Workspace</span>
                    </SidebarHeader>
                    <SidebarContent>
                      <SidebarGroup>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            <SidebarMenuItem>
                              <SidebarMenuButton isActive>
                                <HomeIcon />
                                <span>Home</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton>
                                <FolderIcon />
                                <span>Projects</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton>
                                <UsersIcon />
                                <span>Team</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    </SidebarContent>
                    <SidebarFooter>
                      <span className="px-2 py-1 text-xs text-muted-foreground">
                        v1.0.0
                      </span>
                    </SidebarFooter>
                  </Sidebar>
                  <SidebarInset>
                    <div className="flex items-center gap-2 border-b p-2">
                      <SidebarTrigger />
                      <span className="text-sm font-medium">Inset content</span>
                    </div>
                    <div className="p-4 text-sm text-muted-foreground">
                      Main area lives here, next to the sidebar.
                    </div>
                  </SidebarInset>
                </SidebarProvider>
              </div>
            </Section>

            {/* ============================ DATA DISPLAY ============================ */}
            <Section id="card" title="Card">
              <Card className="w-full max-w-sm">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>You have 3 unread messages.</CardDescription>
                  <CardAction>
                    <Button variant="ghost" size="icon-sm">
                      <BellIcon />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Jane Doe</p>
                      <p className="text-xs text-muted-foreground">
                        Commented on your post.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Mark all as read</Button>
                </CardFooter>
              </Card>
            </Section>

            <Section id="item" title="Item">
              <ItemGroup className="w-full max-w-md">
                <Item>
                  <ItemMedia>
                    <FileIcon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Design.fig</ItemTitle>
                    <ItemDescription>2.4 MB · Updated 2h ago</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon />
                    </Button>
                  </ItemActions>
                </Item>
                <ItemSeparator />
                <Item>
                  <ItemMedia>
                    <CloudIcon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Backup.zip</ItemTitle>
                    <ItemDescription>118 MB · Yesterday</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button variant="ghost" size="icon-sm">
                      <TrashIcon />
                    </Button>
                  </ItemActions>
                </Item>
              </ItemGroup>
            </Section>

            <Section id="empty" title="Empty">
              <Empty className="w-full max-w-md border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchIcon />
                  </EmptyMedia>
                  <EmptyTitle>No results found</EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your filters or search terms.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm">
                    Clear filters
                  </Button>
                </EmptyContent>
              </Empty>
            </Section>

            <Section id="table" title="Table">
              <div className="w-full overflow-hidden rounded-lg border">
                <Table>
                  <TableCaption>A list of recent invoices.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">INV001</TableCell>
                      <TableCell>
                        <Badge>Paid</Badge>
                      </TableCell>
                      <TableCell>Credit Card</TableCell>
                      <TableCell className="text-right">$250.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">INV002</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Pending</Badge>
                      </TableCell>
                      <TableCell>PayPal</TableCell>
                      <TableCell className="text-right">$150.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Section>

            <Section id="avatar" title="Avatar">
              <Demo label="Single">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AB</AvatarFallback>
                </Avatar>
              </Demo>
              <Demo label="Group">
                <AvatarGroup>
                  <Avatar>
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>B</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>C</AvatarFallback>
                  </Avatar>
                  <AvatarGroupCount>+3</AvatarGroupCount>
                </AvatarGroup>
              </Demo>
            </Section>

            <Section id="aspect-ratio" title="Aspect Ratio">
              <div className="w-72">
                <AspectRatio
                  ratio={16 / 9}
                  className="overflow-hidden rounded-lg bg-muted"
                >
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    16:9
                  </div>
                </AspectRatio>
              </div>
            </Section>

            {/* ============================ LAYOUT ============================ */}
            <Section id="separator" title="Separator">
              <div className="space-y-4">
                <div className="flex h-5 items-center gap-3 text-sm">
                  Blog
                  <Separator orientation="vertical" />
                  Docs
                  <Separator orientation="vertical" />
                  Source
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">Horizontal separator above.</p>
              </div>
            </Section>

            <Section id="scroll-area" title="Scroll Area">
              <ScrollArea className="h-40 w-64 rounded-md border p-3">
                <p className="text-sm">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <span key={i} className="block py-0.5">
                      Item #{i + 1}
                    </span>
                  ))}
                </p>
              </ScrollArea>
            </Section>

            <Section id="resizable" title="Resizable">
              <ResizablePanelGroup
                orientation="horizontal"
                className="h-40 w-full max-w-md rounded-lg border"
              >
                <ResizablePanel defaultSize={50}>
                  <div className="flex h-full items-center justify-center p-4 text-sm">
                    One
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={50}>
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel defaultSize={50}>
                      <div className="flex h-full items-center justify-center p-4 text-sm">
                        Two
                      </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50}>
                      <div className="flex h-full items-center justify-center p-4 text-sm">
                        Three
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            </Section>

            <Section id="accordion" title="Accordion">
              <Accordion className="w-full max-w-md">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is it accessible?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Is it styled?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It comes with default styles that match the rest of the library.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Is it animated?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It uses CSS animations by default.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Section>

            <Section id="collapsible" title="Collapsible">
              <Collapsible className="w-full max-w-md space-y-2">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">@peduarte starred 3 repos</span>
                  <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <ChevronRightIcon />
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2">
                  <div className="rounded-md border px-3 py-2 text-sm">@radix-ui/colors</div>
                  <div className="rounded-md border px-3 py-2 text-sm">@radix-ui/primitives</div>
                  <div className="rounded-md border px-3 py-2 text-sm">@stitches/react</div>
                </CollapsibleContent>
              </Collapsible>
            </Section>

            {/* ============================ MISC ============================ */}
            <Section id="calendar" title="Calendar">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={enUS}
                className="rounded-md border"
              />
            </Section>

            <Section id="carousel" title="Carousel">
              <Carousel className="w-full max-w-xs">
                <CarouselContent>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <CarouselItem key={i}>
                      <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-6">
                          <span className="font-heading text-4xl font-semibold">
                            {i + 1}
                          </span>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </Section>

            <Section id="chart" title="Chart">
              <ChartContainer
                config={CHART_CONFIG}
                className="h-64 w-full max-w-2xl"
              >
                <ChartBar />
              </ChartContainer>
            </Section>

            <Section id="command" title="Command">
              <Command className="w-full max-w-md rounded-lg border shadow-sm">
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem>
                      <CalendarIcon />
                      Calendar
                    </CommandItem>
                    <CommandItem>
                      <SmileIcon />
                      Search Emoji
                    </CommandItem>
                    <CommandItem>
                      <PaletteIcon />
                      Change theme
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Settings">
                    <CommandItem>
                      <UserIcon />
                      Profile
                      <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <MailIcon />
                      Mail
                      <CommandShortcut>⌘B</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </Section>

            <Section id="sonner" title="Sonner (Toast)">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast("Event created", {
                      description: "Sunday, December 03, 2023 at 9:00 AM",
                      action: { label: "Undo", onClick: () => {} },
                    })
                  }
                >
                  Show toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.success("Saved successfully")}
                >
                  Success
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.error("Something went wrong")}
                >
                  Error
                </Button>
              </div>
            </Section>

            <Section id="theme-icons" title="Theme icons (lucide)">
              <Demo label="Sample icons">
                <SunIcon className="size-5" />
                <MoonIcon className="size-5" />
                <ArrowRightIcon className="size-5" />
              </Demo>
            </Section>
          </main>

          <Toaster />
        </div>
      </DirectionProvider>
    </TooltipProvider>
  )
}

function ChartBar() {
  return (
    <BarChart data={CHART_DATA}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
      <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
      <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
    </BarChart>
  )
}
