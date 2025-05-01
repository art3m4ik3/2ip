import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Activity } from 'lucide-react';

export function LoadingSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <Card className="w-full shadow-lg animate-pulse">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {[...Array(10)].map((_, index) => (
              <div key={index} className="flex items-start space-x-3">
                <Skeleton className="w-5 h-5 rounded-full mt-1" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg animate-pulse">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
             <Skeleton className="h-5 w-24 mb-2" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex justify-between items-center mt-1">
               <Skeleton className="h-4 w-28" />
               <Skeleton className="h-4 w-16" />
            </div>
          </div>

          <Skeleton className="h-px w-full" />

           <div>
              <Skeleton className="h-5 w-36 mb-2" />
             <div className="flex justify-between items-center">
               <Skeleton className="h-4 w-16" />
               <Skeleton className="h-6 w-20 rounded-full" />
             </div>
              <div className="flex justify-between items-center mt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between items-center mt-1">
                 <Skeleton className="h-4 w-28" />
                 <Skeleton className="h-4 w-16" />
              </div>
           </div>

          <Skeleton className="h-px w-full" />

          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <ul className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <li key={index} className="flex justify-between items-center">
                   <div className="flex items-center gap-1">
                     <Skeleton className="w-4 h-4 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                   </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </li>
              ))}
            </ul>
          </div>

           <Skeleton className="h-px w-full" />

          <div>
             <Skeleton className="h-5 w-28 mb-3" />
            <div className="space-y-3">
               {[...Array(2)].map((_, typeIndex) => (
                 <div key={typeIndex}>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <ul className="list-disc list-inside pl-4 space-y-1">
                      {[...Array(2)].map((_, recordIndex) => (
                         <li key={recordIndex}>
                           <Skeleton className="h-4 w-48" />
                         </li>
                       ))}
                    </ul>
                 </div>
               ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
