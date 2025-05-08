import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UiExample() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Shadcn/UI Components</h1>
      
      <Tabs defaultValue="cards" className="w-full mb-10">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="form">Form Elements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cards" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card Example 1 */}
            <Card>
              <CardHeader>
                <CardTitle>Create project</CardTitle>
                <CardDescription>
                  Deploy your new project in one-click.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Your new project will be ready in just a few seconds.</p>
              </CardContent>
              <CardFooter>
                <Button>Create project</Button>
              </CardFooter>
            </Card>
            
            {/* Card Example 2 */}
            <Card>
              <CardHeader>
                <CardTitle>Notification</CardTitle>
                <CardDescription>
                  You have 3 unread messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>View your recent notifications and updates.</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Dismiss</Button>
                <Button>View all</Button>
              </CardFooter>
            </Card>
            
            {/* Card Example 3 */}
            <Card>
              <CardHeader>
                <CardTitle>Account Summary</CardTitle>
                <CardDescription>
                  Overview of your account activity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Your account is in good standing.</p>
              </CardContent>
              <CardFooter>
                <Button variant="secondary">View Details</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="form" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
              <CardDescription>
                Example of form components from shadcn/ui.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Submit</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 